Feature: Update Hardware Revisions

  The `dev.v.brdV` Thing shadow attribute should be synchronized to the device
  `hardware_version` on Memfault. 

  Background:

    Given I connect a device
    # Prepare the mock API responses.
    And I enqueue this mock HTTP API response with status code 202 for a PATCH request to api.memfault.com/api/v0/organizations/my-org/projects/my-project/devices/my-device
    """
    Content-Type: text/plain; charset=utf-8
    
    Accepted
    """

  Scenario: Update the device board version in the Thing shadow of the device

    # FIXME: Implement