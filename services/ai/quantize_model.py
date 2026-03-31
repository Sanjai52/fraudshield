from onnxruntime.quantization import quantize_dynamic, QuantType
from pathlib import Path

MODEL_DIR = Path("onnx_model")

input_model = MODEL_DIR / "model.onnx"
output_model = MODEL_DIR / "model_quantized.onnx"

print("⚡ Quantizing model...")

quantize_dynamic(
    model_input=str(input_model),
    model_output=str(output_model),
    weight_type=QuantType.QInt8
)

print("✅ Quantization complete")