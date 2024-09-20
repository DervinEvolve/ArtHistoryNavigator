from models import db, User, Resource, BrowsingHistory
from sqlalchemy import func
from collections import Counter

def get_recommendations(user_id, limit=10):
    user = User.query.get(user_id)
    if not user:
        return []

    # Get user interests
    user_interests = set(user.interests.split(',')) if user.interests else set()

    # Get user's browsing history
    browsing_history = BrowsingHistory.query.filter_by(user_id=user_id).order_by(BrowsingHistory.timestamp.desc()).limit(20).all()
    viewed_resource_ids = [history.resource_id for history in browsing_history]

    # Get resources related to user interests
    interest_resources = Resource.query.filter(Resource.tags.contains(func.any(user_interests))).all()

    # Combine interest-based and history-based resources
    all_resources = interest_resources + Resource.query.filter(Resource.id.in_(viewed_resource_ids)).all()

    # Count occurrences of each resource
    resource_counts = Counter(all_resources)

    # Sort resources by count (descending) and then by id (ascending)
    sorted_resources = sorted(resource_counts.items(), key=lambda x: (-x[1], x[0].id))

    # Return the top 'limit' resources
    return [resource for resource, count in sorted_resources[:limit]]

def update_user_history(user_id, resource_id):
    # Check if the resource exists
    resource = Resource.query.get(resource_id)
    if not resource:
        return False

    # Add or update the browsing history
    history = BrowsingHistory.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if history:
        history.timestamp = func.now()
    else:
        history = BrowsingHistory(user_id=user_id, resource_id=resource_id)
        db.session.add(history)

    db.session.commit()
    return True
