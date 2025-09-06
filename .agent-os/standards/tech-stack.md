# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

- App Framework: Django 5.0+ or FastAPI (for API only projects)
- Language: Python 3.13
- Primary Database: PostgreSQL 17+
- ORM: Django ORM or SQLAlchemy if FastAPI
- Build Tool: pyproject.toml with UV
- Package Manager: UV
- Application Hosting: AWS ECS
- Hosting Region: Primary region based on user base
- Database Hosting: AWS Managed Aurora Postgres
- Database Backups: Daily automated
- Asset Storage: Amazon S3
- CDN: CloudFront
- Asset Access: Private with signed URLs
- CI/CD Platform: GitHub Actions
- CI/CD Trigger: Push to main/staging branches
- Tests: Run before deployment
- Production Environment: main branch
- Staging Environment: staging branch
