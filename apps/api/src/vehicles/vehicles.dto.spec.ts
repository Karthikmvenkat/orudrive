import { validateSync } from "class-validator";
import { VehicleImageInputDto } from "./vehicles.dto";

const errorsFor = (url: string) => {
  const dto = new VehicleImageInputDto();
  dto.url = url;
  dto.alt = "Honda Activa 6G available for rent in Puducherry";

  return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })
    .flatMap((violation) => Object.values(violation.constraints ?? {}));
};

/**
 * Vehicle images are stored as text and rendered by whoever shows the gallery.
 * A `javascript:` or protocol-relative URL would sit in the database until a
 * rider's browser ran it, so the shape is decided where the value comes in.
 */
describe("VehicleImageInputDto url", () => {
  it.each([
    "/images/vehicles/honda-activa-6g.jpg",
    "/images/categories/car.jpg",
    "https://cdn.savarigo.example/vehicles/i20.jpg",
    "http://cdn.savarigo.example/vehicles/i20.jpg",
  ])("accepts %p", (url) => {
    expect(errorsFor(url)).toEqual([]);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "//evil.example/x.jpg",
  ])("refuses %p", (url) => {
    expect(errorsFor(url)).toHaveLength(1);
    expect(errorsFor(url)[0]).toMatch(/site-relative path or an http\(s\) URL/);
  });
});
