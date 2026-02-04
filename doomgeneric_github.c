#include <stdint.h>
#include <string.h>

/* DoomGeneric API */
extern void D_DoomMain(void);
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

int main(void) {
    DG_Github_Init();
    D_DoomMain();
    return 0;
}

void DG_Init(void) {
    /* Backend initialization not required */
}

void DG_DrawFrame(void) {
    if (!DG_ScreenBuffer) return;

    /* Integer scaling factors (fixed point 16.16 could be used, but simple float or ratio is fine) */
    /* Using integer math for strict determinism and minimal dependencies */
    
    for (int y = 0; y < GH_RES_Y; y++) {
        int src_y = (y * DOOMGENERIC_RESY) / GH_RES_Y;
        if (src_y >= DOOMGENERIC_RESY) src_y = DOOMGENERIC_RESY - 1;

        for (int x = 0; x < GH_RES_X; x++) {
            int src_x = (x * DOOMGENERIC_RESX) / GH_RES_X;
            if (src_x >= DOOMGENERIC_RESX) src_x = DOOMGENERIC_RESX - 1;

            uint32_t pixel = DG_ScreenBuffer[src_y * DOOMGENERIC_RESX + src_x];
            
            /* Extract RGB (Assume ARGB/XRGB) */
            uint32_t r = (pixel >> 16) & 0xFF;
            uint32_t g = (pixel >> 8) & 0xFF;
            uint32_t b = pixel & 0xFF;

            /* Luma approximation: (R + 2G + B) / 4 */
            uint32_t luma = (r + (g << 1) + b) >> 2;

            /* Quantize 0-255 to 0-4 */
            /* (luma * 5) / 256 */
            uint8_t val = (uint8_t)((luma * GH_COLOR_LEVELS) >> 8);
            if (val >= GH_COLOR_LEVELS) val = GH_COLOR_LEVELS - 1;

            DG_Github_Framebuffer[y * GH_RES_X + x] = val;
        }
    }
}

void DG_SleepMs(uint32_t ms) {
    /* Host controls timing */
}

uint32_t DG_GetTicksMs(void) {
    /* Deterministic time zero */
    return 0;
}

int DG_GetKey(int* pressed, unsigned char* key) {
    if (input_head == input_tail) return 0;

    *key = (unsigned char)input_queue[input_tail].key;
    *pressed = input_queue[input_tail].pressed;
    input_tail = (input_tail + 1) % MAX_INPUT_EVENTS;
    return 1;
}

void DG_SetWindowTitle(const char * title) {
    /* No windowing system */
}
