#if defined(__APPLE__)
#define TL_SYM(name) _##name
#else
#define TL_SYM(name) name
#endif

.text
.globl TL_SYM(tl_mix64_asm)
TL_SYM(tl_mix64_asm):
    movq %rdi, %rax
    xorq %rsi, %rax
    rolq $13, %rax
    ret
