# Human-Like Chess

**Train Transformer models on human chess games and play against them through an interactive web interface.**

Human-Like Chess explores whether Transformer models trained directly on human games can reproduce the strengths, weaknesses, and decision-making patterns associated with players of different Elo ratings.

This repository contains:

* `model_development/Human-Like-Chess.ipynb`, which documents the complete data collection, feature engineering, model training, and evaluation process.
* A Python backend responsible for loading and serving the trained models.
* A React frontend featuring an interactive chessboard that allows users to play against the models.

For a detailed discussion of the project's motivation, methodology, results, and conclusions, please refer to the accompanying report.

## Running Locally

The recommended way to experience the project is to run it locally, which provides the fastest response times and avoids the cold-start delays associated with free hosting services.

```bash
docker-compose up --build
```

Once the containers have started, open the application in your browser and begin playing against the models.

## Online Demo

You can also try the project online:

**https://human-like-chess.vercel.app/**

The React frontend is hosted on Vercel, while the Python backend is hosted on Render using their free service tiers. Consequently, the backend may enter a sleep state after periods of inactivity, causing the initial request to take a minute or longer while the service starts. Subsequent interactions should respond normally.

For the best experience and lowest latency, running the application locally is recommended.
