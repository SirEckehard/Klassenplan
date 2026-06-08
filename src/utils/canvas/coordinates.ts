export interface ClientPointToSceneParams {
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
  sceneWidth: number;
  sceneHeight: number;
}

export function convertClientPointToScene({
  svg,
  clientX,
  clientY,
  sceneWidth,
  sceneHeight,
}: ClientPointToSceneParams) {
  const rect = svg.getBoundingClientRect();
  const scaleX = sceneWidth / rect.width;
  const scaleY = sceneHeight / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function createClientToSceneConverter({
  sceneWidth,
  sceneHeight,
}: {
  sceneWidth: number;
  sceneHeight: number;
}) {
  return (svg: SVGSVGElement, clientX: number, clientY: number) =>
    convertClientPointToScene({
      svg,
      clientX,
      clientY,
      sceneWidth,
      sceneHeight,
    });
}

export function convertClientPointToSvgCoordinates({
  svg,
  clientX,
  clientY,
}: {
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
}): { x: number; y: number } {
  const viewBox = svg.viewBox.baseVal;
  const point = convertClientPointToScene({
    svg,
    clientX,
    clientY,
    sceneWidth: viewBox.width,
    sceneHeight: viewBox.height,
  });

  return {
    x: point.x + viewBox.x,
    y: point.y + viewBox.y,
  };
}
