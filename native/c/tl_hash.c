#include "../include/trustledger_native.h"

uint64_t tl_fnv1a64(const uint8_t *bytes, size_t length) {
    uint64_t hash = 1469598103934665603ULL;

    for (size_t index = 0; index < length; index += 1) {
        hash ^= (uint64_t)bytes[index];
        hash *= 1099511628211ULL;
    }

    return hash;
}

uint32_t tl_reputation_risk_score(uint32_t dispute_count, uint32_t total_count) {
    if (total_count == 0U) {
        return 0U;
    }

    const uint32_t scaled = (dispute_count * 100U) / total_count;
    return scaled > 100U ? 100U : scaled;
}
