"""Import module-owned models so Alembic sees their shared metadata."""

from app.modules.catalog import models as catalog_models  # noqa: F401
from app.modules.content import models as content_models  # noqa: F401
from app.modules.identity import models as identity_models  # noqa: F401
from app.modules.learning import models as learning_models  # noqa: F401
from app.modules.schools import models as schools_models  # noqa: F401
from app.modules.tenancy import models as tenancy_models  # noqa: F401
