from pydantic import BaseModel
from .common import DatasetParams


class PCARequest(DatasetParams):
    n_components: int = 2
