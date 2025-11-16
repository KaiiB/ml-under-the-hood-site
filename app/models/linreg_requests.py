from pydantic import BaseModel
from .common import DatasetParams


class LinRegRequest(DatasetParams):
    fit_intercept: bool = True
