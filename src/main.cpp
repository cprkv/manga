#include <cpr/cpr.h>
#include <iostream>
using namespace std;

int main(int argc, char** argv) {
  cpr::Response r = cpr::Get(cpr::Url{ "https://api.github.com/repos/whoshuu/cpr/contributors" },
                             cpr::Authentication{ "user", "pass" },
                             cpr::Parameters{ { "anon", "true" }, { "key", "value" } });
  cout << r.status_code << '\n'
       << r.header["content-type"] << '\n'
       << r.text;
}
