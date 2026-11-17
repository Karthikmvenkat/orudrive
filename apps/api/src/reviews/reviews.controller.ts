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
  CreateReviewDto,
  ManageReviewsQueryDto,
  ModerateReviewDto,
  VehicleReviewsQueryDto,
} from "./reviews.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get("vehicle/:idOrSlug")
  @ApiOperation({ summary: "Published reviews and rating summary for a vehicle" })
  forVehicle(
    @Param("idOrSlug") idOrSlug: string,
    @Query() query: VehicleReviewsQueryDto,
  ) {
    return this.reviews.listForVehicle(idOrSlug, query);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Review a completed booking (once per booking)" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(userId, dto);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Reviews I have written" })
  mine(
    @CurrentUser("id") userId: string,
    @Query() query: VehicleReviewsQueryDto,
  ) {
    return this.reviews.listMine(userId, query);
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "All reviews for moderation" })
  manage(@Query() query: ManageReviewsQueryDto) {
    return this.reviews.listAll(query);
  }

  @ApiBearerAuth()
  @Patch(":id")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Publish, hide or edit a review" })
  moderate(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviews.moderate(actor, id, dto);
  }

  @ApiBearerAuth()
  @Delete(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Delete a review and recalculate the rating" })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.reviews.remove(actor, id);
  }
}
