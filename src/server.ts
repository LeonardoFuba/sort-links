import fastify from "fastify";
import postgres from "postgres";
import { z } from 'zod';
import { sql } from "./lib/postgres";

const app = fastify();

app.get('/:code', async (request, reply) => {
  const getLinkSchema = z.object({
    code: z.string().min(3),
  })
  const { code } = getLinkSchema.parse(request.params)

  const result = await sql/*sql*/`
    SELECT id, original_url
    FROM sort_links
    WHERE code = ${code};
  `
  if(result.length === 0) {
    return reply.status(400).send({message: 'Link not found.'})
  }

  const link = result[0]

  // 301 = permanente
  // 302 = temporário
  return reply.redirect(301, link.original_url)
})

app.get('/api/links', async (request, reply) => {
  const result = await sql/*sql*/`
    SELECT * 
    FROM sort_links
    ORDER BY created_at DESC
  `
  return { 
    links: result
  }
})

app.post('/api/links', async (request, reply) => {
  const createLinkSchema = z.object({
    code: z.string().min(3),
    url: z.string().url()
  })
  const { code, url } = createLinkSchema.parse(request.body)

  try {
      const result = await sql/*sql*/`
      INSERT INTO sort_links (code, original_url)
      VALUES (${code}, ${url})
      RETURNING id;
    `
    const link = result[0]

    return reply.status(201).send({ 
      shortLinkId: link.id,
    })
  } catch (error) {
    if(error instanceof postgres.PostgresError) {
      if(error.code === '23505') {
        return reply.status(400).send({ message: 'Duplicated code.'})
      }
    }

    console.error(error)

    return reply.status(500).send({ message: 'Internal error.'})
  }
})


app.listen({
  host: '0.0.0.0',
  port: 3333,
}).then(() => {
  console.log('HTTP server running on port 3333')
})
