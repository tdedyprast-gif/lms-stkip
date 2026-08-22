"""Privacy/authorization checks for read endpoints that lack role guards, plus TEST_ data cleanup."""
import os

import pytest
import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE}/api"
T = 60


def tok(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=T)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def mhs():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok('ahmad@student.stkippacitan.ac.id', 'mahasiswa123')}"})
    return s


@pytest.fixture(scope="module")
def adm():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok('admin@stkippacitan.ac.id', 'admin123')}"})
    return s


@pytest.fixture(scope="module")
def course_id(adm):
    return [c for c in adm.get(f"{API}/courses", timeout=T).json() if c["code"] == "TIF301"][0]["id"]


def test_student_cannot_read_full_class_grade_matrix(mhs, course_id):
    r = mhs.get(f"{API}/courses/{course_id}/grades", timeout=T)
    if r.status_code == 200:
        others = [s for s in r.json().get("students", []) if s.get("nim") != "2283207005"]
        assert not others, "Mahasiswa can read the whole class grade matrix (no role guard on GET /courses/:id/grades)"


def test_student_cannot_read_class_attainment(mhs, course_id):
    r = mhs.get(f"{API}/courses/{course_id}/attainment", timeout=T)
    assert r.status_code == 403, "Mahasiswa can read full-class attainment (GET /courses/:id/attainment has no role guard)"


def test_student_cannot_read_early_warning(mhs, course_id):
    r = mhs.get(f"{API}/courses/{course_id}/early-warning", timeout=T)
    assert r.status_code == 403, "Mahasiswa can read the class early-warning list (privacy leak)"


def test_student_cannot_export_class_grades(mhs, course_id):
    r = mhs.get(f"{API}/courses/{course_id}/export/siakad", timeout=T)
    assert r.status_code == 403, "Mahasiswa can download the SIAKAD grade export for the whole class"


def test_cleanup_leftover_test_users(adm):
    """Housekeeping: remove TEST_ users left behind by earlier runs."""
    users = adm.get(f"{API}/users", timeout=T).json()
    leftovers = [u for u in users if u["name"].startswith("TEST_") or u["email"].lower().startswith("test_")]
    for u in leftovers:
        adm.delete(f"{API}/users/{u['id']}", timeout=T)
    after = adm.get(f"{API}/users", timeout=T).json()
    assert not [u for u in after if u["name"].startswith("TEST_") or u["email"].lower().startswith("test_")]
