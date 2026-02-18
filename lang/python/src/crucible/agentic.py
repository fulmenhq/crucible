import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

_PACKAGE_ROOT = Path(__file__).parent
_ROLES_DIR = _PACKAGE_ROOT.parent.parent / "config" / "agentic" / "roles"

_ROLE_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


@dataclass
class RoleMindset:
    focus: list[str] = field(default_factory=list)
    principles: list[str] = field(default_factory=list)


@dataclass
class RoleEscalation:
    target: str = ""
    when: str = ""


@dataclass
class RoleExample:
    type: str = ""
    title: str = ""
    content: str = ""


@dataclass
class RolePrompt:
    """Typed representation of a role definition from the agentic role catalog."""

    slug: str = ""
    name: str = ""
    description: str = ""
    version: str = ""
    status: str = ""
    scope: list[str] = field(default_factory=list)
    responsibilities: list[str] = field(default_factory=list)
    escalates_to: list[RoleEscalation] = field(default_factory=list)
    does_not: list[str] = field(default_factory=list)
    author: str | None = None
    category: str | None = None
    extends: str | None = None
    domains: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    context: str | None = None
    mindset: RoleMindset | None = None
    examples: list[RoleExample] = field(default_factory=list)
    checklists: dict[str, list[str]] = field(default_factory=dict)


def _parse_role(data: dict) -> RolePrompt:
    mindset = None
    if "mindset" in data and data["mindset"]:
        m = data["mindset"]
        mindset = RoleMindset(
            focus=m.get("focus") or [],
            principles=m.get("principles") or [],
        )

    escalates_to = [
        RoleEscalation(target=e.get("target", ""), when=e.get("when", "")) for e in (data.get("escalates_to") or [])
    ]

    examples = [
        RoleExample(
            type=e.get("type", ""),
            title=e.get("title", ""),
            content=e.get("content", ""),
        )
        for e in (data.get("examples") or [])
    ]

    return RolePrompt(
        slug=data.get("slug", ""),
        name=data.get("name", ""),
        description=data.get("description", ""),
        version=data.get("version", ""),
        status=data.get("status", ""),
        author=data.get("author"),
        category=data.get("category"),
        extends=data.get("extends"),
        domains=data.get("domains") or [],
        tags=data.get("tags") or [],
        context=data.get("context"),
        scope=data.get("scope") or [],
        mindset=mindset,
        responsibilities=data.get("responsibilities") or [],
        escalates_to=escalates_to,
        does_not=data.get("does_not") or [],
        examples=examples,
        checklists=data.get("checklists") or {},
    )


def list_role_slugs() -> list[str]:
    """Return the slugs of all available roles. README.md is excluded."""
    return [f.stem for f in sorted(_ROLES_DIR.iterdir()) if f.suffix == ".yaml"]


def load_role(slug: str) -> RolePrompt:
    """Load and parse a single role by slug.

    Raises:
        ValueError: If the role is not found in the embedded catalog.
    """
    if not _ROLE_SLUG_RE.fullmatch(slug):
        raise ValueError(f"Invalid role slug: {slug}")
    role_file = _ROLES_DIR / f"{slug}.yaml"
    if not role_file.exists():
        raise ValueError(f"Role not found: {slug}")
    with open(role_file) as f:
        data = yaml.safe_load(f)
    return _parse_role(data)


def load_role_catalog() -> dict[str, RolePrompt]:
    """Load all roles from the embedded catalog.

    Returns a dict keyed by slug.
    """
    catalog: dict[str, RolePrompt] = {}
    for slug in list_role_slugs():
        role = load_role(slug)
        catalog[role.slug] = role
    return catalog
