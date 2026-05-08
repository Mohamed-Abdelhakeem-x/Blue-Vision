import asyncio
import sys
from uuid import uuid4

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User

async def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python scripts/manage_admins.py promote <email>")
        print("  python scripts/manage_admins.py demote <email>")
        return

    action = sys.argv[1].lower()
    email = sys.argv[2]

    if action not in ("promote", "demote"):
        print("Action must be 'promote' or 'demote'")
        return

    async with SessionLocal() as session:
        # Ensure the admin role exists
        admin_role_name = "System Development Team"
        stmt = select(Role).where(Role.role_name == admin_role_name)
        result = await session.execute(stmt)
        admin_role = result.scalar_one_or_none()

        if not admin_role:
            print(f"Creating role: {admin_role_name}")
            admin_role = Role(role_name=admin_role_name, privileges={"all": True})
            session.add(admin_role)
            await session.commit()
            await session.refresh(admin_role)

        # Find user
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            print(f"Error: User with email {email} not found.")
            return

        if action == "promote":
            user.role_id = admin_role.id
            await session.commit()
            print(f"Success: {email} is now an admin.")
        elif action == "demote":
            # You might want to assign them back to the default farmer role instead of NULL
            # For now, we'll try to find the farmer role
            farmer_role_name = "Nile Tilapia Farm Owners & Managers"
            stmt = select(Role).where(Role.role_name == farmer_role_name)
            farmer_role = (await session.execute(stmt)).scalar_one_or_none()
            if not farmer_role:
                farmer_role = Role(role_name=farmer_role_name, privileges={})
                session.add(farmer_role)
                await session.commit()
                await session.refresh(farmer_role)

            user.role_id = farmer_role.id
            await session.commit()
            print(f"Success: {email} is no longer an admin. Demoted to {farmer_role_name}.")

if __name__ == "__main__":
    asyncio.run(main())
