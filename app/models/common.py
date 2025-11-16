from pydantic import BaseModel
from typing import Optional


class DatasetParams(BaseModel):
    """Shared dataset parameters for requests."""
    name: Optional[str] = None
    n_samples: Optional[int] = 100
