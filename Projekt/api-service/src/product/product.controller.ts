import {
  Controller,
  Get,
  Param,
  Put,
  Patch,
  Delete,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from '../entities/product.entity';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // GET /products/:id → einzelnes Produkt abrufen
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.productService.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    return product;
  }

  // PUT /products/:id → Produkt vollständig ersetzen
  @Put(':id')
  async putProduct(@Param('id') id: string, @Body() body: Product) {
    const updated = await this.productService.update(id, body);
    if (!updated) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    return updated;
  }

  // PATCH /products/:id → Produkt teilweise aktualisieren
  @Patch(':id')
  async patchProduct(
    @Param('id') id: string,
    @Body() body: Partial<Product>,
  ) {
    const updated = await this.productService.update(id, body);
    if (!updated) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    return updated;
  }

  // DELETE /products/:id → Produkt löschen
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.productService.delete(id);
    return { message: `Product with id '${id}' deleted` };
  }
}
