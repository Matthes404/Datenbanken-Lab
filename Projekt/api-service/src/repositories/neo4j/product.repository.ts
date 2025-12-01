import { Inject, Injectable } from '@nestjs/common'
import { Driver } from 'neo4j-driver'
import {
  IProduct,
  IProductRepository,
} from '../interfaces/product.repository.interface'

@Injectable()
export class Neo4jProductRepository implements IProductRepository {
  constructor(
    @Inject('NEO4J_DRIVER')
    private readonly driver: Driver,
  ) {}

  private nodeToProduct(node: any): IProduct {
    const p = node.properties
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      price: Number(p.price),
      in_stock: Number(p.in_stock),
    }
  }

  async findAll(): Promise<IProduct[]> {
    const session = this.driver.session()
    try {
      const res = await session.run(`MATCH (p:Product) RETURN p`)
      return res.records.map(rec => this.nodeToProduct(rec.get('p')))
    } finally {
      await session.close()
    }
  }

  async findById(id: string): Promise<IProduct | null> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `MATCH (p:Product {id: $id}) RETURN p LIMIT 1`,
        { id },
      )
      if (res.records.length === 0) return null
      return this.nodeToProduct(res.records[0].get('p'))
    } finally {
      await session.close()
    }
  }

  async findByTitle(title: string): Promise<IProduct | null> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `MATCH (p:Product {title: $title}) RETURN p LIMIT 1`,
        { title },
      )
      if (res.records.length === 0) return null
      return this.nodeToProduct(res.records[0].get('p'))
    } finally {
      await session.close()
    }
  }

  async create(data: IProduct): Promise<IProduct> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        CREATE (p:Product {
          id: $id,
          title: $title,
          category: $category,
          price: $price,
          in_stock: $in_stock
        })
        RETURN p
        `,
        data,
      )
      return this.nodeToProduct(res.records[0].get('p'))
    } finally {
      await session.close()
    }
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        MATCH (p:Product {id: $id})
        SET p += $data
        RETURN p
        `,
        { id, data },
      )
      if (res.records.length === 0) return null
      return this.nodeToProduct(res.records[0].get('p'))
    } finally {
      await session.close()
    }
  }

  async delete(id: string): Promise<boolean> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        MATCH (p:Product {id: $id})
        WITH p, count(p) AS c
        DETACH DELETE p
        RETURN c AS deleted
        `,
        { id },
      )
      const deleted = res.records[0].get('deleted').toNumber?.() ?? 0
      return deleted > 0
    } finally {
      await session.close()
    }
  }
}
