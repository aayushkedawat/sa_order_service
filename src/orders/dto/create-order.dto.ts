import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsOptional,
  ArrayMaxSize,
  IsInt,
  IsPositive,
} from "class-validator";

class OrderItemDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  itemId: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  quantity: number;
}

class ClientTotalsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  tax: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  deliveryFee: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total: number;
}

class PaymentDto {
  @ApiProperty({ enum: ["COD", "CARD", "UPI", "WALLET"] })
  @IsEnum(["COD", "CARD", "UPI", "WALLET"])
  method: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  restaurantId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  addressId: number;

  @ApiProperty({ type: [OrderItemDto], maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => ClientTotalsDto)
  clientTotals: ClientTotalsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment: PaymentDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
