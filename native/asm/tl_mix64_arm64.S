#if defined(__APPLE__)
#define TL_SYM(name) _##name
#else
#define TL_SYM(name) name
#endif

.text
.globl TL_SYM(tl_mix64_asm)
TL_SYM(tl_mix64_asm):
    eor x0, x0, x1
    ror x0, x0, #51
    ret
