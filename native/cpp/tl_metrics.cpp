#include "../include/trustledger_native.h"

#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>

extern "C" uint64_t tl_sum_u64(const uint64_t *values, size_t length) {
    if (values == nullptr || length == 0U) {
        return 0U;
    }

    const std::span<const uint64_t> items(values, length);
    return std::accumulate(items.begin(), items.end(), uint64_t{0});
}

extern "C" double tl_average_u64(const uint64_t *values, size_t length) {
    if (values == nullptr || length == 0U) {
        return 0.0;
    }

    return static_cast<double>(tl_sum_u64(values, length)) / static_cast<double>(length);
}
