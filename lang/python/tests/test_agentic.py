import pytest

from crucible.agentic import list_role_slugs, load_role, load_role_catalog


def test_list_role_slugs_returns_known_roles():
    slugs = list_role_slugs()
    assert len(slugs) > 0
    assert "devlead" in slugs
    assert "devrev" in slugs
    assert "secrev" in slugs


def test_list_role_slugs_excludes_readme():
    slugs = list_role_slugs()
    assert "README" not in slugs


def test_load_role_valid_slug():
    role = load_role("devlead")
    assert role.slug == "devlead"
    assert role.name
    assert role.description
    assert role.status
    assert len(role.responsibilities) > 0
    assert len(role.scope) > 0
    assert len(role.does_not) > 0


def test_load_role_mindset():
    role = load_role("devlead")
    assert role.mindset is not None
    assert len(role.mindset.focus) > 0
    assert len(role.mindset.principles) > 0


def test_load_role_escalations():
    role = load_role("devlead")
    assert len(role.escalates_to) > 0
    for escalation in role.escalates_to:
        assert escalation.target
        assert escalation.when


def test_load_role_releng_new_fields():
    role = load_role("releng")
    assert len(role.pre_push_checklist) > 0
    assert role.required_reading is not None
    assert role.required_reading.description
    assert len(role.required_reading.files) > 0
    assert role.cross_role_note


def test_load_role_nonexistent_raises():
    with pytest.raises(ValueError, match="Role not found"):
        load_role("nonexistentrole")


def test_load_role_catalog():
    catalog = load_role_catalog()
    assert len(catalog) > 0
    assert "devlead" in catalog
    assert "devrev" in catalog
    assert "secrev" in catalog
    assert catalog["devlead"].slug == "devlead"


def test_load_role_catalog_keyed_by_slug():
    catalog = load_role_catalog()
    for slug, role in catalog.items():
        assert role.slug == slug, f"catalog key {slug!r} != role.slug {role.slug!r}"
