'use client';

import { useState } from 'react';

const NEW = '__new__';

// Dropdown of existing categories plus an "+ Add a new category…" option that
// reveals a text field. A hidden input named "category" carries the final value.
export default function CategoryPicker({ categories = [], defaultValue = 'General' }) {
  const known = categories.includes(defaultValue);
  const [selected, setSelected] = useState(known ? defaultValue : NEW);
  const [newName, setNewName] = useState(known ? '' : defaultValue || '');

  const isNew = selected === NEW;
  const category = isNew ? newName : selected;

  return (
    <>
      <select
        className="select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={NEW}>+ Add a new category…</option>
      </select>
      {isNew ? (
        <input
          className="input"
          style={{ marginTop: 8 }}
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
      ) : null}
      <input type="hidden" name="category" value={category} />
    </>
  );
}
