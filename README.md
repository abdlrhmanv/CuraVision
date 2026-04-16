# CuraVision — Brain Tumor Classification Pipeline

> **From Imagery to Insights:** An end-to-end ML pipeline that transforms MRI segmentation masks into structured features and classifies brain tumors using Microsoft Azure AutoML.

---

## Project Overview

**CuraVision** is the capstone project for the **Digital Egypt Pioneers Initiative (DEPI) — Microsoft AI & Data Science Track**. It demonstrates a complete cloud-based machine learning workflow for classifying brain tumors into four classes: **Glioma**, **Meningioma**, **Pituitary Tumor**, and **No Tumor**.

### Methodology

1. **Feature Extraction** — Computer vision techniques (OpenCV, scikit-image) extract geometric and texture features from MRI segmentation masks, converting raw imagery into a clean tabular dataset.
2. **Local Baseline Model** — A tuned Random Forest (GridSearchCV) serves as a local benchmark to verify feature quality.
3. **Azure AutoML** — The exported dataset is uploaded to Azure ML Studio, where Automated ML handles model selection, hyperparameter optimization, and deployment.

---

## Project Team (DEPI Trainees)

| #  | Name                          | Role               |             Description            |   
|----|-------------------------------|--------------------|-------------------------------------
| 1  | Omar Tarek Emam               | Frontend Developer | Build UI/UX, integrate APIs, display CV & NLP results, and optimize performance
| 2  | Abdelrahman Hisham Ismail     | Backend Developer  | Node.js/Express API, PostgreSQL schema, auth, audit logging
| 3  | Abdelrahman Mahmoud Ahmed     | AI Engineer        | Build and optimize CNN models using Convolutional Neural Networks, implement segmentation, and deploy via FastAPI
| 4  | Abdallah Mohamed Fahmy        | AI Engineer        | Build and optimize CNN models using Convolutional Neural Networks, implement segmentation, and deploy via FastAPI
| 5  | Amgad Mohammed Mohammed       | LLM Engineer       | Develop NLP pipelines using Natural Language Processing and process user inputs into meaningful insights
| 6  | Zyad Atef                     | LLM Enginner       | Develop NLP pipelines using Natural Language Processing and process user inputs into meaningful insights


---

## Tech Stack & Tools

| Layer             | Technology                                                    |
|-------------------|---------------------------------------------------------------|
| **Platform**      | Microsoft Azure Machine Learning                              |
| **Data Source**   | [BRISC 2025](https://arxiv.org/abs/2506.14318) (Nature Scientific Data) |
| **Preprocessing** | Python · OpenCV · scikit-image · Pandas (Google Colab)        |
| **Baseline Model**| scikit-learn (Random Forest + GridSearchCV)                   |
| **Model Training**| Azure Automated ML (Classification)                           |
| **Deployment**    | Azure Real-time Endpoint                                      |

---

## Dataset — BRISC 2025

**BRISC** (BRain tumor Image Segmentation & Classification) is an expert-annotated T1-weighted MRI dataset.

- **6,000 slices** — 5,000 train / 1,000 test
- **4 classes** — Glioma (1,401) · Meningioma (1,635) · Pituitary (1,757) · No Tumor (1,207)
- **3 anatomical views** — Axial · Coronal · Sagittal
- **Pixel-wise masks** — radiologist-reviewed segmentation annotations

See [`brisc2025/README.md`](brisc2025/README.md) for full dataset details, file naming convention, and citation info.

---

## Repository Structure

```
CuraVision/
├── CuraVision.ipynb              # Main notebook (feature extraction → baseline → export)
├── CuraVision_colab.ipynb        # Google Colab version
├── BRISC_Features_Dataset.csv    # Exported features (ready for Azure upload)
├── README.md                     # This file
└── brisc2025/                    # BRISC 2025 dataset
    ├── classification_task/      # Image-level labels (train/test × 4 classes)
    ├── segmentation_task/        # Paired MRI images + binary masks
    ├── features.csv              # Full feature dataset (with split & filename)
    ├── azure_train.csv           # Training split for Azure AutoML
    ├── azure_test.csv            # Test split for Azure AutoML
    ├── manifest.json / .csv      # Dataset manifests + SHA-256 checksums
    └── README.md                 # Dataset documentation & citation
```

---

## Notebook Pipeline

The `CuraVision.ipynb` notebook is organized into the following sections:

### 1. Exploratory Data Analysis (EDA)
- Class distribution (bar charts + pie charts)
- Sample MRI slices vs. segmentation masks
- Image dimension consistency check
- Multi-sample grid & MRI + mask overlay visualization

### 2. Feature Extraction
For each MRI image with a segmentation mask, the pipeline extracts:

| Category     | Features                                                         |
|--------------|------------------------------------------------------------------|
| **Geometric**| area · perimeter · solidity · eccentricity · bounding box ratio  |
| **Texture (GLCM)** | contrast · correlation · energy · homogeneity             |
| **Metadata** | anatomical view (axial / coronal / sagittal) · tumor label       |

> `no_tumor` images have no masks, so all geometric and texture features are set to **0.0** — the absence of features is the discriminative signal.

### 3. Feature Analysis & Visualization
- Histograms with KDE (per tumor class, excl. no_tumor)
- Pearson correlation heatmap
- Box plots per class
- Anatomical view distribution
- Pair plot (selected features)

### 4. Local Baseline Model (Benchmarking)
- **Algorithm:** Random Forest with `GridSearchCV` (5-fold CV)
- **Features:** All 9 extracted features (no outlier removal, no feature dropping)
- **Purpose:** Establish a minimum accuracy threshold before Azure AutoML
- **Output:** Feature importance ranking, classification report, confusion matrix

### 5. Export Final Dataset
- Saves `BRISC_Features_Dataset.csv` — clean, Azure-ready CSV with all features + labels
- 6,000 rows × 11 columns (label, view, + 9 numeric features)

---

## Quick Start

### Prerequisites

```bash
pip install opencv-python scikit-image pandas matplotlib seaborn scikit-learn
```

### Run the Notebook

1. Clone this repository
2. Download the [BRISC 2025 dataset](https://arxiv.org/abs/2506.14318) and place it in `brisc2025/`
3. Open `CuraVision.ipynb` in Jupyter / VS Code / Google Colab
4. Run all cells — the pipeline will:
   - Extract features from all 6,000 MRI images
   - Train a baseline Random Forest
   - Export `BRISC_Features_Dataset.csv`

### Upload to Azure

1. Go to [Azure ML Studio](https://ml.azure.com) → **Data** → **Create** → upload `BRISC_Features_Dataset.csv`
2. Create an **Automated ML** job → Classification → target column: `label` → primary metric: Accuracy
3. Review the best model, register it, and deploy to a real-time endpoint

---

## Results — Local Baseline

| Metric          | Value  |
|-----------------|--------|
| CV Accuracy     | ~64%   |
| Test Accuracy   | ~64%   |
| no_tumor Recall | 100%   |

> This is a **baseline only**. Azure AutoML is expected to surpass these numbers with ensemble methods, stacking, and automated feature engineering.

---

## License

This project is developed for educational purposes as part of the DEPI Microsoft Track. The BRISC 2025 dataset is subject to its own license — see the [original paper](https://arxiv.org/abs/2506.14318) for details.
