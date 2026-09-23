import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { buildApp } from '../src/router/build';

const app = await buildApp(join(import.meta.dir, '../src/app'));

describe('Markdown Twin / Dualmark AEO compliance', () => {
  it('serves /index.md with 200 and AEO headers', async () => {
    const res = await app.request('/index.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(res.headers.get('x-aeo-version')).toBe('1.0');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(res.headers.get('x-markdown-tokens')).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('# Agent Cache');
  });

  it('serves /about.md with 200 and markdown content', async () => {
    const res = await app.request('/about.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(res.headers.get('x-aeo-version')).toBe('1.0');
    const body = await res.text();
    expect(body).toContain('# About Agent Cache');
  });

  it('serves /contact.md and /privacy.md', async () => {
    const resContact = await app.request('/contact.md');
    expect(resContact.status).toBe(200);
    expect(resContact.headers.get('content-type')).toContain('text/markdown');

    const resPrivacy = await app.request('/privacy.md');
    expect(resPrivacy.status).toBe(200);
    expect(resPrivacy.headers.get('content-type')).toContain('text/markdown');
  });

  it('serves /blog.md and /compare.md', async () => {
    const resBlog = await app.request('/blog.md');
    expect(resBlog.status).toBe(200);
    expect(resBlog.headers.get('content-type')).toContain('text/markdown');

    const resCompare = await app.request('/compare.md');
    expect(resCompare.status).toBe(200);
    expect(resCompare.headers.get('content-type')).toContain('text/markdown');
  });

  it('serves blog post markdown twin', async () => {
    const res = await app.request('/blog/100-docs-sites-what-broke.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    const body = await res.text();
    expect(body).toContain('# ');
  });

  it('serves comparison markdown twin', async () => {
    const res = await app.request('/compare/context7.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    const body = await res.text();
    expect(body.toLowerCase()).toContain('context7');
  });

  it('adds Link header for markdown twin on HTML response', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('link')).toContain('rel="alternate"; type="text/markdown"');
    const html = await res.text();
    expect(html).toContain('rel="alternate" type="text/markdown"');
  });

  it('content negotiation returns markdown on Accept: text/markdown', async () => {
    const res = await app.request('/', {
      headers: {
        Accept: 'text/markdown',
      },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(res.headers.get('x-aeo-version')).toBe('1.0');
    const body = await res.text();
    expect(body).toContain('# Agent Cache');
  });
});
