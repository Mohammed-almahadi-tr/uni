Imports System.Data.SqlClient

Public Class frmRptIncomePayments

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.RadioButton1.Checked = True Then
            If Me.CombCollecter.SelectedIndex = -1 Then
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and " & _
                                                  "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                                  "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'", cnn1)
                    Dim das As New DataSet
                    das.Clear()

                    cnn1.Open()
                    dap.Fill(das, "Transactions")
                    cnn1.Close()

                    Dim rpt As New IncomeList
                    rpt.SetDataSource(das)
                    RptViewer.CrystalReportViewer1.ReportSource = rpt
                    RptViewer.CrystalReportViewer1.RefreshReport()
                    RptViewer.CrystalReportViewer1.Zoom(60)
                    RptViewer.ShowDialog()
                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn1.State = ConnectionState.Open Then
                        cnn1.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            Else
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and " & _
                                                  "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                                  "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                                                  "and Collector=N'" & Me.CombCollecter.SelectedItem & "'", cnn1)
                    Dim das As New DataSet
                    das.Clear()

                    cnn1.Open()
                    dap.Fill(das, "Transactions")
                    cnn1.Close()

                    Dim rpt As New IncomeListByCollecter
                    rpt.SetDataSource(das)
                    RptViewer.CrystalReportViewer1.ReportSource = rpt
                    RptViewer.CrystalReportViewer1.RefreshReport()
                    RptViewer.CrystalReportViewer1.Zoom(60)
                    RptViewer.ShowDialog()
                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn1.State = ConnectionState.Open Then
                        cnn1.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        ElseIf Me.RadioButton2.Checked = True Then
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند دفع' and " & _
                                              "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                              "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'", cnn1)
                Dim das As New DataSet
                das.Clear()

                cnn1.Open()
                dap.Fill(das, "Transactions")
                cnn1.Close()

                Dim rpt As New PaymentList
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn1.State = ConnectionState.Open Then
                    cnn1.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Sub FillCollectors()
        Try
            Dim CollectorsList As New ArrayList
            CollectorsList = GetCollectorsList()
            Me.CombCollecter.Items.Clear()

            For Each CollegeName As String In CollectorsList
                Me.CombCollecter.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmRptIncomePayments_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillCollectors()
    End Sub
End Class