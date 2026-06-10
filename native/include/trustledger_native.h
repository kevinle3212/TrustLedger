#ifndef TRUSTLEDGER_NATIVE_H
#define TRUSTLEDGER_NATIVE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

uint64_t tl_fnv1a64(const uint8_t *bytes, size_t length);
uint32_t tl_reputation_risk_score(uint32_t dispute_count, uint32_t total_count);
double tl_average_u64(const uint64_t *values, size_t length);
uint64_t tl_sum_u64(const uint64_t *values, size_t length);
uint64_t tl_mix64_asm(uint64_t left, uint64_t right);

#ifdef __cplusplus
}
#endif

#endif
