from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:mehedi@localhost:5432/enterprise_task_db_anti')
with engine.begin() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'subtasks';"))
    print([r[0] for r in res])
