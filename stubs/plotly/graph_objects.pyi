"""Minimal plotly.graph_objects stubs used by analytics generation."""

class Bar:
    def __init__(
        self,
        *,
        x: object,
        y: object,
        marker: object = ...,
        hovertemplate: str = ...,
    ) -> None: ...

class Figure:
    def __init__(self, *, data: list[object], layout: dict[str, object]) -> None: ...
    def to_plotly_json(self) -> dict[str, object]: ...
