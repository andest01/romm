"""`fields=`: let a list endpoint return only the fields a client asks for."""

from collections.abc import Callable, Mapping
from typing import Annotated, Any

from fastapi import HTTPException, Query, status
from pydantic import BaseModel

# Always returned when a client projects, so every item stays addressable.
ALWAYS_SELECTED: frozenset[str] = frozenset({"id"})

FieldSelection = frozenset[str] | None


def schema_field_names(schema: type[BaseModel]) -> frozenset[str]:
    """Every name `schema` serializes, computed fields included."""
    return frozenset(schema.model_fields) | frozenset(schema.model_computed_fields)


def field_selection(
    schema: type[BaseModel],
    *,
    groups: Mapping[str, frozenset[str]] | None = None,
) -> Callable[..., FieldSelection]:
    """Build a dependency that reads `fields=` for an endpoint returning `schema`.

    Args:
        schema: The item schema the endpoint returns.
        groups: Named field sets a client can request as `@name`.

    Returns:
        A dependency yielding the selected names, or None when `fields` is absent.
    """
    allowed = schema_field_names(schema)
    named = dict(groups or {})
    for name, members in named.items():
        if unknown := members - allowed:
            raise ValueError(f"Group @{name} names unknown fields: {sorted(unknown)}")
    group_list = ", ".join(f"`@{name}`" for name in sorted(named)) or "none"

    def dependency(
        fields: Annotated[
            str | None,
            Query(
                description=(
                    "Comma-separated field names to return for each item, and"
                    f" `@group` names (groups: {group_list}). `id` is always"
                    " included. A field that was not requested is absent from the"
                    " item; `null` means it was requested and has no value."
                    " Omit to get every field."
                )
            ),
        ] = None,
    ) -> FieldSelection:
        if fields is None:
            return None
        selected: set[str] = set()
        unknown: list[str] = []
        for name in {n.strip() for n in fields.split(",") if n.strip()}:
            if name.startswith("@") and name[1:] in named:
                selected |= named[name[1:]]
            elif name in allowed:
                selected.add(name)
            else:
                unknown.append(name)
        if unknown:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown fields: {', '.join(sorted(unknown))}",
            )
        return frozenset(selected) | (ALWAYS_SELECTED & allowed)

    return dependency


def wants(fields: FieldSelection, name: str) -> bool:
    """Whether a response projected to `fields` carries `name`."""
    return fields is None or name in fields


def project(item: BaseModel, fields: frozenset[str]) -> dict[str, Any]:
    """`item` as JSON-ready data with only the selected fields."""
    return item.model_dump(mode="json", include=set(fields))
