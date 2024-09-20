from models import db, User, Resource, BrowsingHistory
from sqlalchemy import func
from collections import Counter
from datetime import datetime, timedelta

def get_recommendations(user_id, limit=10):
    user = User.query.get(user_id)
    if not user:
        return []

    # Get user interests
    user_interests = set(user.interests.split(',')) if user.interests else set()

    # Get user's browsing history with timestamps
    browsing_history = BrowsingHistory.query.filter_by(user_id=user_id).order_by(BrowsingHistory.timestamp.desc()).limit(50).all()

    # Calculate weights based on recency
    now = datetime.utcnow()
    weighted_history = []
    for history in browsing_history:
        days_ago = (now - history.timestamp).days
        weight = 1 / (days_ago + 1)  # More recent items get higher weight
        weighted_history.append((history.resource_id, weight))

    # Get resources related to user interests
    interest_resources = Resource.query.filter(Resource.tags.overlap(user_interests)).all()

    # Combine interest-based and history-based resources with weights
    resource_scores = Counter()
    for resource in interest_resources:
        resource_scores[resource] += 1  # Base score for matching interests

    for resource_id, weight in weighted_history:
        resource = Resource.query.get(resource_id)
        if resource:
            resource_scores[resource] += weight

    # Content-based filtering: Add scores for resources with similar tags
    for resource, score in list(resource_scores.items()):
        similar_resources = Resource.query.filter(Resource.tags.overlap(resource.tags.split(','))).all()
        for similar in similar_resources:
            if similar != resource:
                resource_scores[similar] += 0.5 * score

    # Collaborative filtering: Add scores based on similar users
    similar_users = User.query.filter(User.interests.overlap(user_interests)).all()
    for similar_user in similar_users:
        if similar_user.id != user_id:
            similar_user_history = BrowsingHistory.query.filter_by(user_id=similar_user.id).order_by(BrowsingHistory.timestamp.desc()).limit(20).all()
            for history in similar_user_history:
                resource = Resource.query.get(history.resource_id)
                if resource:
                    resource_scores[resource] += 0.3  # Lower weight for collaborative recommendations

    # Sort resources by score (descending) and then by id (ascending)
    sorted_resources = sorted(resource_scores.items(), key=lambda x: (-x[1], x[0].id))

    # Return the top 'limit' resources
    return [resource for resource, score in sorted_resources[:limit]]

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

def get_popular_resources(limit=10):
    # Get the most viewed resources in the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    popular_resources = db.session.query(
        BrowsingHistory.resource_id,
        func.count(BrowsingHistory.id).label('view_count')
    ).filter(BrowsingHistory.timestamp >= thirty_days_ago
    ).group_by(BrowsingHistory.resource_id
    ).order_by(func.count(BrowsingHistory.id).desc()
    ).limit(limit).all()

    return [Resource.query.get(resource_id) for resource_id, _ in popular_resources]
