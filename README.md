# React Highlighter

![React Highlighter Demo](./assets/highlighter-demo.gif)

A lightweight, Medium-like text highlighter for React. Highlight text, add comments, and rehydrate saved annotations.

---

## Features

- Highlight text with custom colors.
- Add comments or annotations.
- Save and rehydrate highlights.
- Easily copy selected text.

---

## Installation

Install the library using npm or yarn:

npm install react-highlighter

or

yarn add react-highlighter

---

## Usage

import React, { useState } from "react";
import { Highlighter } from "react-highlighter";

const App = () => {
const [annotations, setAnnotations] = useState([]);

const handleCreate = (annotation) => setAnnotations([...annotations, annotation]);
const handleRemove = (annotation) => setAnnotations(annotations.filter(a => a.text !== annotation.text));

return (
<Highlighter
      createAnnotation={handleCreate}
      removeAnnotation={handleRemove}
      annotations={annotations}
    />
);
};

export default App;

---

## Props

| Name             | Type     | Description                            |
| ---------------- | -------- | -------------------------------------- |
| createAnnotation | Function | Triggered when a highlight is created. |
| removeAnnotation | Function | Triggered when a highlight is removed. |
| annotations      | Array    | Pre-existing highlights.               |

---

## Customization

Change styles like highlight colors:

.highlighter-circle-sketch-highlight {
background-color: yellow;
}

---

## Demo

Check the live demo: https://your-demo-link.com

---

## License

This project is licensed under the MIT License.
