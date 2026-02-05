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
#define GH_RES_X 53
#define GH_RES_Y 39
#define GH_BUFFER_SIZE 2067
#define GH_COLOR_LEVELS 5
#define MAX_INPUT_EVENTS 16

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
    doomgeneric_Create(argc, argv);
    return 0;
}

void DG_Init(void) {
}

void DG_DrawFrame(void) {
    if (!DG_ScreenBuffer) return;

    for (int y = 0; y < GH_RES_Y; y++) {
        int src_y = (y * DOOMGENERIC_RESY) / GH_RES_Y;
        if (src_y >= DOOMGENERIC_RESY) src_y = DOOMGENERIC_RESY - 1;

        for (int x = 0; x < GH_RES_X; x++) {
            int src_x = (x * DOOMGENERIC_RESX) / GH_RES_X;
            if (src_x >= DOOMGENERIC_RESX) src_x = DOOMGENERIC_RESX - 1;

            uint32_t pixel = DG_ScreenBuffer[src_y * DOOMGENERIC_RESX + src_x];
            
            // Format: 0x00RRGGBB (XRGB)
            uint32_t r = (pixel >> 16) & 0xFF;
            uint32_t g = (pixel >> 8) & 0xFF;
            uint32_t b = pixel & 0xFF;

            // Simplified Luma: (R + 2G + B) / 4
            uint32_t luma = (r + (g << 1) + b) >> 2;

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
