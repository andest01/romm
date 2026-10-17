import pytest
from fastapi import HTTPException
from pydantic import BaseModel, computed_field

from endpoints.fields import field_selection, project, wants


class _Item(BaseModel):
    id: int
    name: str
    blob: dict[str, int] | None = None
    extra: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def label(self) -> str:
        return self.name.upper()


SELECT = field_selection(_Item, groups={"heavy": frozenset({"blob", "extra"})})


def test_no_fields_means_everything() -> None:
    assert SELECT(None) is None
    assert wants(None, "anything")


def test_names_are_trimmed_and_id_is_always_added() -> None:
    assert SELECT(" name , label ") == frozenset({"id", "name", "label"})
    assert SELECT("") == frozenset({"id"})


def test_a_group_expands_to_its_members() -> None:
    assert SELECT("@heavy") == frozenset({"id", "blob", "extra"})


def test_unknown_names_and_groups_are_a_400_naming_them() -> None:
    with pytest.raises(HTTPException) as raised:
        SELECT("name,nope,@missing")
    assert raised.value.status_code == 400
    assert raised.value.detail == "Unknown fields: @missing, nope"


def test_a_group_naming_an_unknown_field_fails_at_definition() -> None:
    with pytest.raises(ValueError, match="nope"):
        field_selection(_Item, groups={"bad": frozenset({"nope"})})


def test_project_keeps_only_the_selected_fields_and_their_nulls() -> None:
    item = _Item(id=1, name="zelda")

    assert project(item, frozenset({"id", "extra", "label"})) == {
        "id": 1,
        "extra": None,
        "label": "ZELDA",
    }
