Imports System.Data.SqlClient

Module Utilities

    Public Function GetMoveNo(ByVal Year As Integer) As Integer
        Try
            Dim MoveNo As Integer
            Dim cmdMoveNo As New SqlCommand("select max(MoveNo) from transactions Where Year(TransDate)=" & Year.ToString, cnn1)

            cnn1.Open()
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Function GetDocSNo(ByVal DocType As String) As Integer
        Try
            Dim MoveNo As Integer
            Dim cmdMoveNo As New SqlCommand("Select Max(SNo) From Transactions Where Transtype=N'" & DocType & "'", cnn1)

            cnn1.Open()
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Sub PrintBill(ByVal TransType As String, ByVal SNo As Integer)
        Try
            Dim strPayBill As String
            strPayBill = "Select TransType,SNo,Source Acc1,Descr,ChNo,Writting,TotalValueIn+TotalValueOut TotalOut,TransDate " & _
                         "From Transactions Where Transtype = N'" & TransType & "' and SNo=" & SNo

            Dim dap As New SqlDataAdapter(strPayBill, cnn)
            Dim das As New DataSet
            das.Clear()
            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New Bill
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.CrystalReportViewer2.Zoom(60)
            rptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Function GetBalancePack(ByVal Pack As String) As Double
        Try
            Dim Balance As Double
            Dim cmdBalance As New SqlCommand("Select Sum(TotalValueIn)-Sum(TotalValueOut) From Transactions " & _
                                             "Where Package=N'" & Pack & "'", cnn1)

            cnn1.Open()
            Balance = CDbl(cmdBalance.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 0
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Pack As String, ByVal Acc As String) As Double
        Try
            Dim Balance As Double
            Dim cmdBalance As New SqlCommand("Select Sum(TotalValueIn)-Sum(TotalValueOut) From Transactions " & _
                                             "Where Package=N'" & Pack & "' and Acc=N'" & Acc & "'", cnn1)

            cnn1.Open()
            Balance = CInt(cmdBalance.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 0
        End Try
    End Function

    Public Function GetBalanceSubAcc(ByVal Pack As String, ByVal Acc As String, ByVal SubAcc As String) As Double
        Try
            Dim Balance As Double
            Dim cmdBalance As New SqlCommand("Select Sum(TotalValueIn)-Sum(TotalValueOut) From Transactions " & _
                                             "Where Package=N'" & Pack & "' and Acc=N'" & Acc & "' " & _
                                             "and   SubAcc=N'" & SubAcc & "'", cnn1)

            cnn1.Open()
            Balance = CInt(cmdBalance.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 0
        End Try
    End Function

    Public Sub PrintVoucher(ByVal MoveNo As Integer, ByVal Year As Integer)
        Try
            Dim dap As New SqlDataAdapter("select MoveNo,Descr Description,Package,Acc AccountName,SubAcc SubAccount," & _
                     "TotalValueIn,TotalValueOut,TransDate,ChNo CheckNo " & _
                     "From Transactions Where MoveNo=" & MoveNo & " and Year(TransDate)=" & Year.ToString, cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New DailyChainRpt
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Module
