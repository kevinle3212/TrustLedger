"""Minimal scipy.stats stubs used by analytics generation."""

from numpy.typing import NDArray
import numpy as np

class LinregressResult:
    slope: float

def entropy(pk: NDArray[np.float64], base: int = ...) -> float: ...
def linregress(x: NDArray[np.int64], y: NDArray[np.float64]) -> LinregressResult: ...
def zscore(a: NDArray[np.float64]) -> NDArray[np.float64]: ...
