export function uploadRoutes(app: any) {
  app.post('/api/upload', async (c) => {
    try {
      const fd = await c.req.formData();
      const file = fd.get('file') as File;
      if (!file) return c.json({ error: 'File required' }, 400);
      if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Max 10MB' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const url = `https://stiqr-backend.ksangeeth76.workers.dev/files/${id}/${file.name}`;
      await c.env.DB.prepare('INSERT INTO uploaded_files (id, originalName, fileName, mimeType, size, path, url, uploadedBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, file.name, file.name, file.type, file.size, `/files/${id}/${file.name}`, url, c.var.userId, now).run();
      return c.json({ data: { id, originalName: file.name, mimeType: file.type, size: file.size, url } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/upload/:id', async (c) => {
    try {
      const file = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(c.req.param('id')).first();
      if (!file) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: file });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/upload/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE uploaded_files SET deletedAt = ? WHERE id = ?').bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'File deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
