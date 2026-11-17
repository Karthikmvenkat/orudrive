import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import { CreateCategoryDto, UpdateCategoryDto } from "./categories.dto";
import { CategoriesService } from "./categories.service";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List active vehicle categories with counts" })
  list() {
    return this.categories.listPublic();
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List every category (admin/support)" })
  manage() {
    return this.categories.listForAdmins();
  }

  @ApiBearerAuth()
  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Create a vehicle category (admin)" })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @ApiBearerAuth()
  @Patch(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Update a vehicle category (admin)" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Delete an empty category (admin)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  @Public()
  @Get(":idOrSlug")
  @ApiOperation({ summary: "Category details by id or slug" })
  get(@Param("idOrSlug") idOrSlug: string) {
    return this.categories.getPublic(idOrSlug);
  }
}
