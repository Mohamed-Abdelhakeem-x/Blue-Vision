from app.services.recommendations import recommendation_for_label


def test_recommendation_matches_tomato_alias_variants():
    recommendation = recommendation_for_label("Tomato___Septorialeafspot")
    assert "small circular lesions" in recommendation


def test_recommendation_matches_spider_mite_variant():
    recommendation = recommendation_for_label("Tomato___Spider_mites Two-spotted_spider_mite")
    assert "underside webbing" in recommendation


def test_recommendation_matches_yellow_leaf_curl_variant():
    recommendation = recommendation_for_label("Tomato___TomatoYellowLeafCurlVirus")
    assert "whitefly" in recommendation
