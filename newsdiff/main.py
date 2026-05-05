from newsdiff import config
from newsdiff.api import build_app
from newsdiff.storage import create_engine_and_tables


cfg = config.load()
engine = create_engine_and_tables(cfg.database_url)
app = build_app(engine=engine)
