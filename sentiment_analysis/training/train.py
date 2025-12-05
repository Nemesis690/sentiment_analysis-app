# training/train.py
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras import layers, models
import numpy as np
import os
import pickle

# Config
VOCAB_SIZE = 20000
MAX_LEN = 200
EMBED_DIM = 128
BATCH_SIZE = 64
EPOCHS = 4
MODEL_DIR = os.path.join("..", "backend", "model_files")
os.makedirs(MODEL_DIR, exist_ok=True)

# 1) Load IMDB dataset (raw text)
print("Loading IMDB dataset (raw text)...")
(train_data, train_labels), (test_data, test_labels) = tf.keras.datasets.imdb.load_data(num_words=VOCAB_SIZE)
word_index = tf.keras.datasets.imdb.get_word_index()

# Convert integer sequences back to text
index_word = {v+3:k for k,v in word_index.items()}
index_word[0] = "<PAD>"
index_word[1] = "<START>"
index_word[2] = "<UNK>"
index_word[3] = "<UNUSED>"

def decode_review(seq):
    return " ".join([index_word.get(i, "?") for i in seq])

train_texts = [decode_review(s) for s in train_data]
test_texts  = [decode_review(s) for s in test_data]

# 2) Tokenize (Keras Tokenizer)
tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token="<OOV>")
tokenizer.fit_on_texts(train_texts)

train_seq = tokenizer.texts_to_sequences(train_texts)
test_seq  = tokenizer.texts_to_sequences(test_texts)

train_pad = pad_sequences(train_seq, maxlen=MAX_LEN, padding="post", truncating="post")
test_pad  = pad_sequences(test_seq,  maxlen=MAX_LEN, padding="post", truncating="post")

y_train = np.array(train_labels)
y_test  = np.array(test_labels)

# 3) Build model
model = models.Sequential([
    layers.Embedding(VOCAB_SIZE, EMBED_DIM, input_length=MAX_LEN),
    layers.Bidirectional(layers.LSTM(64, return_sequences=False)),
    layers.Dense(64, activation="relu"),
    layers.Dropout(0.4),
    layers.Dense(1, activation="sigmoid")
])

model.compile(loss="binary_crossentropy", optimizer="adam", metrics=["accuracy"])
model.summary()

# 4) Train
model.fit(train_pad, y_train, validation_data=(test_pad, y_test), epochs=EPOCHS, batch_size=BATCH_SIZE)

# 5) Save model and tokenizer
model_path = os.path.join(MODEL_DIR, "sentiment_model.h5")
tokenizer_path = os.path.join(MODEL_DIR, "tokenizer.pkl")
print("Saving model to", model_path)
model.save(model_path)

with open(tokenizer_path, "wb") as f:
    pickle.dump(tokenizer, f)

print("Saved tokenizer to", tokenizer_path)
print("Training complete.")
