# Aircraft model attribution

Aircraft GLB models are fetched on demand from [AMVLab aircraft-models](https://github.com/amvlab/aircraft-models) (A320, A350, A380, B737 and B787, logo-free variants).

The aircraft models are **not** part of the MIT-licensed source code. The models and images are © their respective authors / AMVLab and are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This project does not modify or redistribute their model files. The URL is configurable through `model_source` if you host those models yourself; retain this attribution in that case.

The MVP uses a generic aircraft as a fallback when the type is unsupported or the model cannot be fetched. For unsupported ICAO types it uses the A320 asset; this is an approximation, not an exact match.
