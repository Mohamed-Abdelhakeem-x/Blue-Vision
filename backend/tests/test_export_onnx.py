from scripts.export_onnx import _select_export_state_dict


def test_select_export_state_dict_prefers_ema_weights():
    checkpoint = {
        "model_state_dict": {"layer.weight": "model"},
        "ema_state_dict": {"layer.weight": "ema"},
    }

    selected = _select_export_state_dict(checkpoint)

    assert selected == {"layer.weight": "ema"}


def test_select_export_state_dict_falls_back_to_model_weights():
    checkpoint = {
        "model_state_dict": {"layer.weight": "model"},
        "ema_state_dict": None,
    }

    selected = _select_export_state_dict(checkpoint)

    assert selected == {"layer.weight": "model"}
