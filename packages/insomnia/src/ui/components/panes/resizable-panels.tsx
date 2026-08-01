import {
  Group,
  Panel as ResizablePanel,
  Separator,
  useDefaultLayout,
  type GroupImperativeHandle,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { forwardRef, type ComponentProps } from 'react';

export type ImperativePanelGroupHandle = GroupImperativeHandle;
export type ImperativePanelHandle = PanelImperativeHandle;

type PanelGroupProps = Omit<ComponentProps<typeof Group>, 'orientation' | 'groupRef'> & {
  direction?: 'horizontal' | 'vertical';
  autoSaveId?: string;
};

type PanelProps = Omit<ComponentProps<typeof ResizablePanel>, 'panelRef' | 'order' | 'onResize'> & {
  order?: number;
  onCollapse?: () => void;
  onExpand?: () => void;
  onResize?: ComponentProps<typeof ResizablePanel>['onResize'];
};

const PanelGroupInner = forwardRef<GroupImperativeHandle, PanelGroupProps & { layout?: ReturnType<typeof useDefaultLayout> }>(
  function PanelGroupInner({ direction = 'horizontal', layout, ...props }, ref) {
    return (
      <Group
        orientation={direction}
        groupRef={ref}
        defaultLayout={layout?.defaultLayout}
        onLayoutChanged={layout?.onLayoutChanged}
        {...props}
      />
    );
  },
);

const PersistedPanelGroup = forwardRef<GroupImperativeHandle, PanelGroupProps & { autoSaveId: string }>(
  function PersistedPanelGroup({ autoSaveId, ...props }, ref) {
    const layout = useDefaultLayout({ id: autoSaveId });
    return <PanelGroupInner {...props} ref={ref} layout={layout} />;
  },
);

export const PanelGroup = forwardRef<GroupImperativeHandle, PanelGroupProps>(function PanelGroup(
  { autoSaveId, ...props },
  ref,
) {
  if (autoSaveId) {
    return <PersistedPanelGroup autoSaveId={autoSaveId} {...props} ref={ref} />;
  }

  return <PanelGroupInner {...props} ref={ref} />;
});

export function PanelResizeHandle(props: ComponentProps<typeof Separator>) {
  return <Separator {...props} />;
}

export const Panel = forwardRef<PanelImperativeHandle, PanelProps>(function Panel(
  { order: _order, onCollapse, onExpand, onResize, ...props },
  ref,
) {
  return (
    <ResizablePanel
      panelRef={ref}
      onResize={(size, id, prevSize) => {
        onResize?.(size, id, prevSize);
        if (prevSize !== undefined) {
          if (size.asPercentage === 0 && prevSize.asPercentage > 0) {
            onCollapse?.();
          }
          if (size.asPercentage > 0 && prevSize.asPercentage === 0) {
            onExpand?.();
          }
        }
      }}
      {...props}
    />
  );
});
