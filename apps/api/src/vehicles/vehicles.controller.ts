import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  CreateVehicleDto,
  ManageVehiclesQueryDto,
  UpdateVehicleDto,
  UpdateVehicleImageDto,
  VehicleImageInputDto,
  VehicleQueryDto,
} from "./vehicles.dto";
import { VehiclesService } from "./vehicles.service";

@ApiTags("vehicles")
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List and search available vehicles" })
  list(@Query() query: VehicleQueryDto) {
    return this.vehicles.listPublic(query);
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.VENDOR, ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List vehicle inventory (vendor/admin/support)" })
  manage(@CurrentUser() actor: AuthUser, @Query() query: ManageVehiclesQueryDto) {
    return this.vehicles.listForStaff(actor, query);
  }

  @ApiBearerAuth()
  @Get("manage/:id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Get a vehicle for management" })
  manageDetail(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.getForStaff(actor, id);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Create a vehicle (vendor/admin)" })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(actor, dto);
  }

  @ApiBearerAuth()
  @Patch("images/:imageId")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Update an image's alt text, order or primary flag" })
  updateImage(
    @CurrentUser() actor: AuthUser,
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateVehicleImageDto,
  ) {
    return this.vehicles.updateImage(actor, imageId, dto);
  }

  @ApiBearerAuth()
  @Delete("images/:imageId")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Delete a vehicle image" })
  removeImage(
    @CurrentUser() actor: AuthUser,
    @Param("imageId", ParseUUIDPipe) imageId: string,
  ) {
    return this.vehicles.removeImage(actor, imageId);
  }

  @ApiBearerAuth()
  @Post(":id/images")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Attach an image URL to a vehicle" })
  addImage(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VehicleImageInputDto,
  ) {
    return this.vehicles.addImage(actor, id, dto);
  }

  @ApiBearerAuth()
  @Patch(":id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Update a vehicle (vendor/admin)" })
  update(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(actor, id, dto);
  }

  @ApiBearerAuth()
  @Delete(":id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Retire a vehicle (vendor/admin)" })
  remove(@CurrentUser() actor: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.vehicles.remove(actor, id);
  }

  @Public()
  @Get(":idOrSlug")
  @ApiOperation({ summary: "Vehicle details by id or slug" })
  get(@Param("idOrSlug") idOrSlug: string) {
    return this.vehicles.getPublic(idOrSlug);
  }
}
