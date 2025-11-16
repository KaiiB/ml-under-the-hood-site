"""App package for ml-under-the-hood-site."""

from .server import app  # expose FastAPI app at package level

__all__ = ["app"]
