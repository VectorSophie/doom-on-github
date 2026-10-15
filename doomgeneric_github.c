#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <emscripten.h>

/* Timer Implementation via EM_JS - Necessary for high-resolution timing in WASM */
EM_JS(uint32_t, get_host_ticks_ms, (void), {
    if (!self.startTime) self.startTime = performance.now();
    return Math.floor(performance.now() - self.startTime);
});

/* DoomGeneric API */
extern void doomgeneric_Create(int argc, char **argv);
extern void doomgeneric_Tick(void);
extern void DG_Init(void);
extern void DG_DrawFrame(void);
extern void DG_SleepMs(uint32_t ms);
extern uint32_t DG_GetTicksMs(void);
extern int DG_GetKey(int* pressed, unsigned char* key);
extern void DG_SetWindowTitle(const char * title);
extern uint32_t* DG_ScreenBuffer;

/* Configuration */
#define DOOMGENERIC_RESX 320
#define DOOMGENERIC_RESY 200
/* GH_RES_X is capped at 53: GitHub's real contribution graph only has 53
 * week-columns, so we can't add more without breaking the real grid.
 * GH_RES_Y is synthetic (extra <tr> rows injected by the display driver),
 * so it's free to grow for more vertical detail. */
#define GH_RES_X 53
#define GH_RES_Y 60
#define GH_BUFFER_SIZE (GH_RES_X * GH_RES_Y)
#define GH_COLOR_LEVELS 5
#define MAX_INPUT_EVENTS 16

/* 4x4 ordered (Bayer) dither matrix, scaled to +/-32 luma, to break up the
 * hard banding you get from quantizing luma straight into 5 levels. */
static const int8_t DITHER4x4[4][4] = {
    {-32,   0, -24,   8},
    { 16, -16,  24,  -8},
    {-20,  12, -28,   4},
    { 28,  -4,  20, -12},
};

/* Exported Storage */
uint8_t DG_Github_Framebuffer[GH_BUFFER_SIZE];

EMSCRIPTEN_KEEPALIVE
uint8_t* DG_GetFramebufferPtr(void) {
    return DG_Github_Framebuffer;
}

EMSCRIPTEN_KEEPALIVE
uint8_t DG_Github_FB_Read(int i) {
    if (i < 0 || i >= GH_BUFFER_SIZE) return 0;
    return DG_Github_Framebuffer[i];
}

/* Internal State */
typedef struct {
    int key;
    int pressed;
} input_event_t;

static input_event_t input_queue[MAX_INPUT_EVENTS];
static int input_head = 0;
static int input_tail = 0;

/* Implementation */

void DG_Github_Init(void) {
    memset(DG_Github_Framebuffer, 0, GH_BUFFER_SIZE);
    input_head = 0;
    input_tail = 0;
}

int DG_Github_Input(int key, int pressed) {
    int next = (input_head + 1) % MAX_INPUT_EVENTS;
    if (next == input_tail) return 1;

    input_queue[input_head].key = key;
    input_queue[input_head].pressed = pressed;
    input_head = next;
    return 0;
}

int main(int argc, char** argv) {
    DG_Github_Init();

    /* -warp 1 1 auto-starts E1M1 directly via G_InitNew, skipping the
     * title screen, the attract-mode demo loop, and the menu entirely.
     * This matters for more than convenience: starting a game through the
     * menu runs G_DoNewGame(), which *unconditionally* resets
     * respawnparm/fastparm/nomonsters to false, silently discarding
     * -respawn below. Only the autostart path (G_InitNew called directly
     * from D_DoomMain) honors it. Without -warp, a passive display host
     * would also just sit on the demo loop forever showing a canned
     * recording instead of a live, continuously-respawning game.
     *
     * Shareware E1 only has a handful of monsters, and they never come
     * back once killed, so a long-running display thins out fast.
     * -respawn is vanilla Doom's own standard flag for making dead
     * monsters reappear after ~12s, keeping demon presence up without
     * touching the WAD or game logic. */
    static char arg0[] = "doom";
    static char arg1[] = "-warp";
    static char arg2[] = "1";
    static char arg3[] = "1";
    static char arg4[] = "-respawn";
    static char *forced_argv[] = { arg0, arg1, arg2, arg3, arg4 };
    (void)argc;
    (void)argv;
    doomgeneric_Create(5, forced_argv);
    return 0;
}

void DG_Init(void) {
}

void DG_DrawFrame(void) {
    if (!DG_ScreenBuffer) return;

    for (int y = 0; y < GH_RES_Y; y++) {
        int src_y0 = (y * DOOMGENERIC_RESY) / GH_RES_Y;
        int src_y1 = ((y + 1) * DOOMGENERIC_RESY) / GH_RES_Y;
        if (src_y1 <= src_y0) src_y1 = src_y0 + 1;
        if (src_y1 > DOOMGENERIC_RESY) src_y1 = DOOMGENERIC_RESY;

        for (int x = 0; x < GH_RES_X; x++) {
            int src_x0 = (x * DOOMGENERIC_RESX) / GH_RES_X;
            int src_x1 = ((x + 1) * DOOMGENERIC_RESX) / GH_RES_X;
            if (src_x1 <= src_x0) src_x1 = src_x0 + 1;
            if (src_x1 > DOOMGENERIC_RESX) src_x1 = DOOMGENERIC_RESX;

            // Box-filter every source pixel the output cell covers instead
            // of point-sampling one pixel, so the downscaled image doesn't
            // look noisy/aliased.
            uint32_t sum = 0;
            int count = 0;
            for (int sy = src_y0; sy < src_y1; sy++) {
                for (int sx = src_x0; sx < src_x1; sx++) {
                    uint32_t pixel = DG_ScreenBuffer[sy * DOOMGENERIC_RESX + sx];
                    uint32_t r = (pixel >> 16) & 0xFF;
                    uint32_t g = (pixel >> 8) & 0xFF;
                    uint32_t b = pixel & 0xFF;
                    sum += (r + (g << 1) + b) >> 2; // Simplified Luma
                    count++;
                }
            }
            int luma = (int)(sum / (uint32_t)count);
            luma += DITHER4x4[y & 3][x & 3];
            if (luma < 0) luma = 0;
            if (luma > 255) luma = 255;

            // Map 0-255 to 0-4 (GitHub Levels)
            // GitHub Level 0: Background/Empty (#161b22)
            // Level 1-4: Green shades
            uint8_t val = 0;
            if (luma > 200) val = 4;
            else if (luma > 140) val = 3;
            else if (luma > 80) val = 2;
            else if (luma > 35) val = 1; // High enough to distinguish from background
            else val = 0;

            DG_Github_Framebuffer[y * GH_RES_X + x] = val;
        }
    }
}

void DG_SleepMs(uint32_t ms) {
}

uint32_t DG_GetTicksMs(void) {
    return get_host_ticks_ms();
}

int DG_GetKey(int* pressed, unsigned char* key) {
    if (input_head == input_tail) return 0;

    *key = (unsigned char)input_queue[input_tail].key;
    *pressed = input_queue[input_tail].pressed;
    input_tail = (input_tail + 1) % MAX_INPUT_EVENTS;
    return 1;
}

void DG_SetWindowTitle(const char * title) {
}
