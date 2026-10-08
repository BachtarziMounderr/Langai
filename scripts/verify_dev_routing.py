"""Exercise development workspaces against a running frontend and backend."""

from os import environ
from re import search
from sys import stdout

import httpx

API = "http://localhost:8000"
WEB = "http://localhost:3000"
DOMAIN = "lingua-dev.invalid"
ROLES = {
    "student": ("/student", ("/teacher", "/admin", "/super-admin")),
    "teacher": ("/teacher", ("/admin", "/super-admin")),
    "admin": ("/admin", ("/teacher", "/super-admin")),
    "super-admin": ("/super-admin", ("/teacher", "/admin")),
    "personal": ("/student", ("/teacher", "/admin", "/super-admin")),
}


def main() -> None:
    password = environ.get("DEV_FIXTURE_PASSWORD")
    if not password:
        raise SystemExit("Set DEV_FIXTURE_PASSWORD from the ignored local fixture file")
    with httpx.Client(follow_redirects=False, timeout=30) as anonymous:
        response = anonymous.get(f"{WEB}/student")
        assert response.status_code == 307 and response.headers["location"] == "/login"

    for name, (allowed, denied) in ROLES.items():
        with httpx.Client(follow_redirects=False, timeout=30) as client:
            login = client.post(
                f"{API}/api/v1/auth/login",
                json={"email": f"dev-{name}@{DOMAIN}", "password": password},
            )
            assert login.status_code == 200, (name, login.status_code)
            assert "Path=/" in login.headers["set-cookie"]
            assert client.get(f"{API}/api/v1/auth/session").status_code == 200
            assert client.get(f"{WEB}{allowed}").status_code == 200, name
            for route in denied:
                response = client.get(f"{WEB}{route}")
                assert response.status_code == 307, (name, route, response.status_code)
                assert response.headers["location"] == "/forbidden"
            logout = client.post(
                f"{API}/api/v1/auth/logout",
                headers={"Origin": WEB, "X-Requested-With": "XMLHttpRequest"},
            )
            assert logout.status_code == 204
            assert client.get(f"{WEB}{allowed}").headers["location"] == "/login"
            stdout.write(f"{name}: OK\n")

    with httpx.Client(follow_redirects=False, timeout=30) as client:
        login = client.post(
            f"{API}/api/v1/auth/login",
            json={"email": f"dev-multi@{DOMAIN}", "password": password},
        )
        assert login.status_code == 200
        contexts = client.get(f"{API}/api/v1/auth/session").json()["contexts"]
        assert len(contexts) == 2
        assert client.get(f"{WEB}/teacher").headers["location"] == "/select-context"
        by_role = {context["role"]: context for context in contexts}
        for role, route in (("TEACHER", "/teacher"), ("SCHOOL_ADMIN", "/admin")):
            selector = client.get(f"{WEB}/select-context")
            assert selector.status_code == 200
            action = search(r'name="(\$ACTION_ID_[^"]+)"', selector.text)
            assert action is not None
            choice = client.post(
                f"{WEB}/select-context",
                files={action.group(1): (None, ""), "context_id": (None, by_role[role]["id"])},
                headers={"Origin": WEB},
            )
            assert choice.status_code == 303 and choice.headers["location"] == route
            assert client.get(f"{WEB}{route}").status_code == 200
            other_route = "/admin" if route == "/teacher" else "/teacher"
            assert client.get(f"{WEB}{other_route}").headers["location"] == "/forbidden"
        assert client.get(f"{WEB}/teacher").headers["location"] == "/forbidden"
        stdout.write("multi-context: OK\n")


if __name__ == "__main__":
    main()
