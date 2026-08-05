import { WidgetZone } from "@mercurjs/dashboard-shared";

import { SingleColumnPage } from "@components/layout/pages";
import { ReturnListTable } from "./_components/return-list-table";

const ReturnListPage = () => {
  return (
    <SingleColumnPage showMetadata={false} showJSON={false} hasOutlet>
      <WidgetZone id="returns.list">
        <ReturnListTable />
      </WidgetZone>
    </SingleColumnPage>
  );
};

export const Component = ReturnListPage;
