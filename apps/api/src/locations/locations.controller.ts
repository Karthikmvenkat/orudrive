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
import { CreateLocationDto, UpdateLocationDto } from "./locations.dto";
import { LocationsService } from "./locations.service";

@ApiTags("locations")
@Controller("locations")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List active pickup hubs" })
  list() {
    return this.locations.listPublic();
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List every hub (admin/support)" })
  manage() {
    return this.locations.listForAdmins();
  }

  @ApiBearerAuth()
  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Create a pickup hub (admin)" })
  create(@Body() dto: CreateLocationDto) {
    return this.locations.create(dto);
  }

  @ApiBearerAuth()
  @Patch(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Update a pickup hub (admin)" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locations.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Delete an unused hub (admin)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.locations.remove(id);
  }

  @Public()
  @Get(":idOrSlug")
  @ApiOperation({ summary: "Hub details by id or slug" })
  get(@Param("idOrSlug") idOrSlug: string) {
    return this.locations.getPublic(idOrSlug);
  }
}
